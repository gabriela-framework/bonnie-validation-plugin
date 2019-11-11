const {is, ucFirst, getArgNames, hasKey} = require('../library/util');
const Joi = require('@hapi/joi');
const deepcopy = require('deepcopy');

function _determineConstraintValueType(constraintValue) {
    if (is('object', constraintValue)) {
        return 'object';
    }

    if (Array.isArray(constraintValue)) {
        return 'array';
    }

    return 'scalar';
}

function _createSchemaBuilder(type, constraints, propName) {
    let schemaBuilder = Joi[type]();

    for (const [constraintName, constraintValue] of Object.entries(constraints)) {
        const constraintType = _determineConstraintValueType(constraintValue);

        if (constraintType === 'object') {
            let val;

            if (Array.isArray(constraintValue.value)) {
                val = constraintValue.value;
            } else {
                val = [constraintValue.value];
            }

            const message = constraintValue.message;

            if (message) {
                const err = new Error(message);
                err.propName = propName;
                err.type = constraintName;

                schemaBuilder = schemaBuilder[constraintName](...val).error(err);
            } else {
                schemaBuilder = schemaBuilder[constraintName](...val);
            }
        } else if (constraintType === 'array') {
            schemaBuilder = schemaBuilder[constraintName](...constraintValue);
        } else {
            let args = [];
            const argStrings = getArgNames(constraints[constraintName]);

            if (argStrings.length > 0) {
                args = [constraintValue];
            }

            schemaBuilder = schemaBuilder[constraintName](...args);
        }
    }

    return schemaBuilder;
}

function _createDefinition(validator) {
    return {
        name: `validate${ucFirst(validator.modelName)}`,
        scope: 'public',
        cache: false,
        init: function() {
            return function(state) {
                const errorPropName = `${validator.modelName}Errors`;
                const propertyMetadata = validator.propertyMetadata;

                state[errorPropName] = null;

                if (!state[validator.modelName]) {
                    let message = '';

                    if (propertyMetadata.nonExistentModelMessage) {
                        message = propertyMetadata.nonExistentModelMessage;
                    } else {
                        message = `Invalid request. Unknown model '${validator.modelName}'.`;
                    }

                    state[errorPropName] = {
                        'nonExistentModelMessage': message,
                    };

                    return;
                }

                if (state[validator.modelName]) {
                    const {error, value} = validator.schemaValidator.validate(state[validator.modelName], {
                        abortEarly: false,
                    });

                    const errors = {};

                    if (error instanceof Error) {
                        errors[error.propName] = error.message;
                    } else {
                        for (const detail of error.details) {
                            const key = detail.context.label;
                            const value = detail.message;

                            errors[key] = value;
                        }
                    }

                    state[errorPropName] = errors;
                }
            }
        }
    };
}

module.exports = {
    name: 'validatorCompilerPass',
    compilerPass: {
        init: function(config, compiler) {
            const validatorConfig = config['config']['validator'];

            if (!hasKey(validatorConfig, 'models')) {
                throw new Error(`Invalid validator config. 'models' key is empty`);
            }

            if (!is('object', validatorConfig['models'])) {
                throw new Error(`Invalid validator config. 'models' key has to be an object`);
            }

            const models = validatorConfig['models'];

            for (const [modelName, propertyMetadata] of Object.entries(models)) {
                const builtSchema = {};

                try {
                    for (const [propName, constraintMetadata] of Object.entries(propertyMetadata['properties'])) {
                        builtSchema[propName] = _createSchemaBuilder(
                            constraintMetadata['type'],
                            constraintMetadata['constraints'],
                            propName
                        );
                    }
                } catch (err) {
                    const message = `Validator plugin error. An error has been thrown by Joi from Hapi.js with message: '${err.message}'`;

                    throw new Error(message);
                }

                const validator = {
                    schemaValidator: Joi.object(builtSchema),
                    modelName: modelName,
                    propertyMetadata: deepcopy(propertyMetadata),
                };

                compiler.add(_createDefinition(validator));
            }
        }
    },
    init: function() {
        return {};
    }
};