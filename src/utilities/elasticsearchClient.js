const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'http://localhost:9200' // Make sure this points to your actual Elasticsearch instance
});

async function createIndex() {
  const indexName = 'bigdataindexing';
  try {
    const { body: indexExists } = await client.indices.exists({ index: indexName });
    if (!indexExists) {
      const response = await client.indices.create({
        index: indexName,
        body: {
          "settings": {
            "number_of_shards": 1, // Adjust shard settings as needed
            "number_of_replicas": 0 // For development, you might not need replicas
          },
          "mappings": {
            "properties": {
              "plan_join": { // Renamed to reflect its purpose
                "type": "join",
                "relations": {
                  "plan": ["linkedPlanServices"],
                  "linkedPlanServices": ["linkedService", "planserviceCostShares"]
                }
              },
              "planCostShares": { // Consider if this should be a separate child type or nested
                "type": "object",
                "properties": {
                  "deductible": { "type": "integer" },
                  "_org": { "type": "keyword" },
                  "copay": { "type": "integer" },
                  "objectId": { "type": "keyword" },
                  "objectType": { "type": "keyword" }
                }
              },
              "linkedPlanServices": { // Depending on query needs, consider "type": "nested"
                "type": "object", // or "type": "child"
                "properties": {
                  "linkedService": {
                    "type": "object",
                    "properties": {
                      "_org": { "type": "keyword" },
                      "objectId": { "type": "keyword" },
                      "objectType": { "type": "keyword" },
                      "name": { "type": "text" }
                    }
                  },
                  "planserviceCostShares": {
                    "type": "object",
                    "properties": {
                      "deductible": { "type": "integer" },
                      "_org": { "type": "keyword" },
                      "copay": { "type": "integer" },
                      "objectId": { "type": "keyword" },
                      "objectType": { "type": "keyword" }
                    }
                  },
                  "_org": { "type": "keyword" },
                  "objectId": { "type": "keyword" },
                  "objectType": { "type": "keyword" }
                }
              },
              "_org": { "type": "keyword" },
              "objectId": { "type": "keyword" },
              "objectType": { "type": "keyword" },
              "planType": { "type": "keyword" },
              "creationDate": { "type": "date", "format": "yyyy-MM-dd" }
            }
          }
        }
      });
      console.log(`Index ${indexName} created successfully: ${JSON.stringify(response.body)}`);
    } else {
      console.log(`Index ${indexName} already exists.`);
    }
  } catch (error) {
    console.error(`Error creating index ${indexName}:`, error);
    throw error; // Rethrow to handle the error elsewhere or log it
  }
}

module.exports = { client, createIndex };
