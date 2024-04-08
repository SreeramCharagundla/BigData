const { validatePlan, savePlan, getPlanById, deletePlanById, updatePlanInRedis } = require('../models/planModel');
const { generateETag, checkETagMatch } = require('../middlewares/etagHandler');

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
    res.set('ETag', etag).status(201).json({ message: "Data added to Redis successfully." });
};

exports.getPlan = async (req, res) => {
    const { id } = req.params;
    const plan = await getPlanById(id);
    if (!plan) {
        return res.status(404).json({ message: "No data found for the provided ID." });
    }
    const etag = generateETag(plan);
    if (checkETagMatch(req, etag)) {
        return res.status(304).send();
    }
    res.set('ETag', etag).json(plan);
};




exports.updatePlan = async (req, res) => {
    const { id } = req.params;
    // Assuming `getPlanById` and `updatePlanInRedis` handle the Redis key internally
    const existingPlan = await getPlanById(id);
    if (!existingPlan) {
        console.log(`${id}: Plan not found.`);
        return res.status(404).json({ message: "Plan not found." });
    }

    console.log("Executing the UPDATE method for plan.");

    // ETag handling
    const etag = generateETag(existingPlan); // Assuming this generates an ETag based on the existing plan
    const clientEtag = req.headers['if-match'];

    if (!clientEtag) {
        console.log("Etag not provided!");
        return res.status(428).json({ message: "Etag not provided!" });
    }

    if (clientEtag !== etag) {
        console.log("Etag doesn't match.");
        res.setHeader('ETag', etag);
        return res.status(412).json({ message: "Etag doesn't match." });
    }

    console.log("Etag match checked.");

    // Validate request body
    if (!req.body.linkedPlanServices || !Array.isArray(req.body.linkedPlanServices)) {
        console.log("Invalid body: LinkedPlanServices must be an array.");
        return res.status(400).json({ message: "LinkedPlanServices must be an array." });
    }

    // Filter out duplicate and existing objectIds
    const newLinkedPlanServices = req.body.linkedPlanServices.filter(newService => 
        !existingPlan.linkedPlanServices.some(existingService => 
            existingService.objectId === newService.objectId));

    if (newLinkedPlanServices.length === 0) {
        console.log("No new unique linkedPlanServices provided.");
        return res.status(200).json({ message: "No update was made. All provided objectIds already exist." });
    }

    console.log("Filtered duplicate object IDs.");

    // Attempt to update the plan with new linkedPlanServices
    const updatedPlan = {
        ...existingPlan,
        linkedPlanServices: [...existingPlan.linkedPlanServices, ...newLinkedPlanServices]
    };

    // Perform schema validation
    const validationResult = validatePlan(updatedPlan);
    if (validationResult !== true) {
        console.log("Schema validation failed.");
        return res.status(400).json({ message: "Schema validation failed. Could not update.", errors: validationResult });
    }

    console.log("Performed schema validation successfully.");

    // Proceed with updating the plan in Redis since validation passed
    await updatePlanInRedis(id, updatedPlan);
    const newEtag = generateETag(updatedPlan); // Generate new ETag for the updated plan

    // Respond with the updated plan and new ETag
    console.log("Update successful, sending updated plan.");
    res.setHeader('ETag', newEtag);
    return res.status(200).json(updatedPlan);
};




exports.deletePlan = async (req, res) => {
    const { id } = req.params;
    const plan = await getPlanById(id);
    if (!plan) {
        return res.status(404).json({ message: "Object not found." });
    }

    const etag = generateETag(plan);
    if (!req.headers['if-match'] || req.headers['if-match'] !== etag) {
        return res.status(412).json({ message: "Etag doesn't match" });
    }

    await deletePlanById(id);
    res.status(204).send();
};

