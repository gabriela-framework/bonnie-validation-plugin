const validator = {
    validator: {
        models: {
            propertyRequiredModel: {
                nonExistentModelMessage: 'Model non existent. Invalid request',
                properties: {
                    name: {
                        type: 'string',
                        constraints: {
                            required: true,
                            min: {
                                value: 3,
                                message: `'name' property has to have at least 3 characters`,
                            },
                            max: 10
                        }
                    }
                }
            }
        }
    }
};

const config = {
    config: {
        framework: {},
        ...validator
    }
};

module.exports = config;