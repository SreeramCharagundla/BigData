const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const ajv = new Ajv();
addFormats(ajv);

const redis = require('../db/redisClient');

const planSchema = {
    type: "object",
    properties: {
        planCostShares: {
            type: "object",
            properties: {
                deductible: {type: "number"},
                _org: {type: "string", format: "hostname"},
                copay: {type: "number"},
                objectId: {type: "string"},
                objectType: {type: "string"}
            },
            required: ["deductible", "_org", "copay", "objectId", "objectType"]
        },
        linkedPlanServices: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    linkedService: {
                        type: "object",
                        properties: {
                            _org: {type: "string", format: "hostname"},
                            objectId: {type: "string"},
                            objectType: {type: "string"},
                            name: {type: "string"}
                        },
                        required: ["_org", "objectId", "objectType", "name"]
                    },
                    planserviceCostShares: {
                        type: "object",
                        properties: {
                            deductible: {type: "number"},
                            _org: {type: "string", format: "hostname"},
                            copay: {type: "number"},
                            objectId: {type: "string"},
                            objectType: {type: "string"}
                        },
                        required: ["deductible", "_org", "copay", "objectId", "objectType"]
                    },
                    _org: {type: "string", format: "hostname"},
                    objectId: {type: "string"},
                    objectType: {type: "string"}
                },
                required: ["linkedService", "planserviceCostShares", "_org", "objectId", "objectType"]
            }
        },
        _org: {type: "string", format: "hostname"},
        objectId: {type: "string"},
        objectType: {type: "string"},
        planType: {type: "string"},
        creationDate: {type: "string", format: "date"}
    },
    required: ["planCostShares", "linkedPlanServices", "_org", "objectId", "objectType", "planType", "creationDate"]
};

exports.validatePlan = (data) => {
    const validate = ajv.compile(planSchema);
    return validate(data) ? true : validate.errors;
};

exports.savePlan = async (plan) => {
    await redis.set(plan.objectId, JSON.stringify(plan));
};

exports.getPlanById = async (id) => {
    const data = await redis.get(id);
    return data ? JSON.parse(data) : null;
};

exports.updatePlanInRedis = async (id, updatedPlan) => {
    await redis.set(id, JSON.stringify(updatedPlan));
};

exports.deletePlanById = async (id) => {
    await redis.del(id);
};
