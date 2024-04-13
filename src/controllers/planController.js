const {
  validatePlan,
  savePlan,
  getPlanById,
  deletePlanById,
  updatePlanInRedis,
} = require("../models/planModel");
const { generateETag, checkETagMatch } = require("../middlewares/etagHandler");
const publishMessage = require("../utilities/rabbitMQPublisher");
const { index } = require("../utilities/elasticsearchClient");
const { client, createIndex } = require("../utilities/elasticsearchClient");

exports.createPlan = async (req, res) => {
    const plan = req.body;
    const validation = validatePlan(plan);
    if (validation !== true) {
      return res.status(400).json({ errors: validation });
    }
  
    // Check for duplicate objectId
    const existingPlan = await getPlanById(plan.objectId);
    if (existingPlan) {
      return res.status(409).json({ message: "A plan with the same objectId already exists." });
    }
  
    await savePlan(plan);
    const etag = generateETag(plan);
  
    try {
      // Ensure the index is created and up to date
    //   await createIndex();
  
      // Index the parent plan
      await client.index({
        index: "bigdataindexing",
        id: plan.objectId,
        body: {
          ...plan,
          plan_join: { name: 'plan' } // Assuming 'plan' is the designated parent type
        }
      });
      console.log(`Parent plan indexed with ID: ${plan.objectId}`);
  
      // Index each child document
      if (plan.linkedPlanServices && plan.linkedPlanServices.length > 0) {
        for (const service of plan.linkedPlanServices) {
          await client.index({
            index: 'bigdataindexing',
            routing: plan.objectId, // Use the plan's ID as the routing value
            body: {
              ...service,
              plan_join: {
                name: 'linkedPlanServices',
                parent: plan.objectId
              }
            }
          });
          console.log(`Linked service indexed with ID: ${service.objectId}`);
        }
      }
  
    } catch (error) {
      console.error("Failed to index document in Elasticsearch:", error);
      return res.status(500).json({ message: "Failed to index document in Elasticsearch", error: error.message });
    }
  
    // Publish a message to RabbitMQ indicating a new plan has been created
    const message = JSON.stringify({
      action: "create",
      planId: plan.objectId,
      timestamp: new Date(),
    });
    await publishMessage("planCreatedQueue", message).catch(err => {
      console.error("Failed to publish message to RabbitMQ:", err);
    });
  
    res.set("ETag", etag).status(201).json({ message: "Data added to Redis successfully." });
  };

  exports.getPlan = async (req, res) => {
    const { id } = req.params;
    const plan = await getPlanById(id);
    if (!plan) {
      return res
        .status(404)
        .json({ message: "No data found for the provided ID." });
    }
    const etag = generateETag(plan);
    if (checkETagMatch(req, etag)) {
      return res.status(304).send();
    }
  
    const accessMessage = JSON.stringify({
      action: "access",
      planId: id,
      timestamp: new Date(),
    });
    await publishMessage("planAccessQueue", accessMessage).catch((err) =>
      console.error("Failed to publish access message:", err)
    );
  
    res.set("ETag", etag).json(plan);
  };

  exports.updatePlan = async (req, res) => {
    const { id } = req.params;
    const existingPlan = await getPlanById(id);
    if (!existingPlan) {
      console.log(`${id}: Plan not found.`);
      return res.status(404).json({ message: "Plan not found." });
    }
  
    console.log("Executing the UPDATE method for plan.");
    const etag = generateETag(existingPlan);
    const clientEtag = req.headers["if-match"];
  
    if (!clientEtag) {
      console.log("Etag not provided!");
      return res.status(428).json({ message: "Etag not provided!" });
    }
  
    if (clientEtag !== etag) {
      console.log("Etag doesn't match.");
      res.setHeader("ETag", etag);
      return res.status(412).json({ message: "Etag doesn't match." });
    }
  
    console.log("Etag match checked.");
    if (!req.body.linkedPlanServices || !Array.isArray(req.body.linkedPlanServices)) {
      console.log("Invalid body: LinkedPlanServices must be an array.");
      return res.status(400).json({ message: "LinkedPlanServices must be an array." });
    }
  
    const newLinkedPlanServices = req.body.linkedPlanServices.filter(newService =>
      !existingPlan.linkedPlanServices.some(existingService => existingService.objectId === newService.objectId)
    );
  
    if (newLinkedPlanServices.length === 0) {
      console.log("No new unique linkedPlanServices provided.");
      return res.status(304).json({ message: "No update was made. All provided objectIds already exist." });
    }
  
    console.log("Filtered duplicate object IDs.");
    const updatedPlan = {
      ...existingPlan,
      linkedPlanServices: [...existingPlan.linkedPlanServices, ...newLinkedPlanServices]
    };
  
    const validationResult = validatePlan(updatedPlan);
    if (validationResult !== true) {
      console.log("Schema validation failed.");
      return res.status(400).json({ message: "Schema validation failed. Could not update.", errors: validationResult });
    }
  
    console.log("Performed schema validation successfully.");
    await updatePlanInRedis(id, updatedPlan);
    const newEtag = generateETag(updatedPlan); 
  
    try {
      await client.index({
        index: "bigdataindexing",
        id: id,
        body: updatedPlan,
        refresh: true  // Ensures the updated document is immediately searchable
      });
      console.log(`Plan updated in Elasticsearch with ID: ${id}`);
    } catch (error) {
      console.error("Failed to index updated document in Elasticsearch:", error);
      return res.status(500).json({ message: "Failed to index updated document in Elasticsearch" });
    }
  
    const updateMessage = JSON.stringify({ action: "update", planId: id, timestamp: new Date() });
    await publishMessage("planUpdatedQueue", updateMessage).catch(err => console.error("Failed to publish update message:", err));
  
    res.setHeader("ETag", newEtag);
    return res.status(200).json(updatedPlan);
  };

  exports.deletePlan = async (req, res) => {
    console.log(`entered delete`);
    const { id } = req.params;
    const plan = await getPlanById(id);
    console.log(`id = `,id);
    console.log(`plan = `,plan);
    if (!plan) {
      console.log("Plan not found in database:", id);
      return res.status(404).json({ message: "Object not found." });
    }

    const etag = generateETag(plan);
    if (!req.headers["if-match"] || req.headers["if-match"] !== etag) {
      console.log("Etag mismatch:", etag, "vs", req.headers["if-match"]);
      return res.status(412).json({ message: "Etag doesn't match" });
    }

    await deletePlanById(id); // Assuming this deletes from your primary data store

    try {
      const esResponse = await client.delete({
        index: "bigdataindexing",
        id: id,
      });
      
      // Check if the deletion was successful based on Elasticsearch's response
      if (esResponse && esResponse.result === 'deleted') {
        console.log(`Plan deleted from Elasticsearch with ID: ${id}`);
        res.status(204).send();
      } 
      else {
        console.error("Failed to delete document in Elasticsearch:", esResponse);
        res.status(500).json({
          message: "Deletion failed, document was not found in Elasticsearch",
          elasticsearchResponse: esResponse.body
        });
      }
    } catch (error) {
      console.error("Error during deletion process:", error);
      res.status(500).json({
        message: "Deletion failed due to an internal error",
        error: error.toString()
      });
    }
};
