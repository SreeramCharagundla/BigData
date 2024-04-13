// utilities/elasticsearchClient.js

const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });

async function createIndex() {
  const indexName = 'bigdataindexing';
  const { body: indexExists } = await client.indices.exists({ index: indexName });
  if (!indexExists) {
    await client.indices.create({
      index: indexName,
      body: {
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: {
          properties: {
            "plan_join": { "type": "join", "relations": { "plan": ["linkedPlanServices"] } },
            "objectId": { "type": "keyword" },
            "objectType": { "type": "keyword" },
            "planType": { "type": "keyword" },
            "creationDate": { "type": "date", "format": "yyyy-MM-dd" },
            "_org": { "type": "keyword" },
            "planCostShares": {
              "type": "object",
              "properties": {
                "deductible": { "type": "integer" },
                "copay": { "type": "integer" },
                "objectId": { "type": "keyword" },
                "objectType": { "type": "keyword" },
                "_org": { "type": "keyword" }
              }
            },
            "linkedPlanServices": {
              "type": "object",
              "properties": {
                "objectId": { "type": "keyword" },
                "objectType": { "type": "keyword" },
                "_org": { "type": "keyword" },
                "linkedService": {
                  "type": "object",
                  "properties": {
                    "name": { "type": "text" },
                    "objectId": { "type": "keyword" },
                    "objectType": { "type": "keyword" },
                    "_org": { "type": "keyword" }
                  }
                },
                "planserviceCostShares": {
                  "type": "object",
                  "properties": {
                    "deductible": { "type": "integer" },
                    "copay": { "type": "integer" },
                    "objectId": { "type": "keyword" },
                    "objectType": { "type": "keyword" },
                    "_org": { "type": "keyword" }
                  }
                }
              }
            }
          }
        }
      }
    });
    console.log(`Index ${indexName} created successfully.`);
  } else {
    console.log(`Index ${indexName} already exists.`);
  }
}

module.exports = { client, createIndex };
