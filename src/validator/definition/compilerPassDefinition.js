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

function _createArgs(schemaBuilder, constraintName, value) {
    if (Array.isArray(value)) {
        return value;
    }

    let args = [];
    const argStrings = getArgNames(schemaBuilder[constraintName]);

    if (argStrings.length > 0) {
        args = [value];
    }

    return args;
}

function _createSchemaBuilder(type, constraints, propName) {
    let schemaBuilder = Joi[type]();

    for (const [constraintName, constraintValue] of Object.entries(constraints)) {
        const constraintType = _determineConstraintValueType(constraintValue);

        if (constraintType === 'object') {
            const args = _createArgs(schemaBuilder, constraintName, constraintValue.value);

            const message = constraintValue.message;

            if (message) {
                const err = new Error(message);
                err.propName = propName;
                err.type = constraintName;

                schemaBuilder = schemaBuilder[constraintName](...args).error(err);
            } else {
                schemaBuilder = schemaBuilder[constraintName](...args);
            }
        } else if (constraintType === 'array') {
            schemaBuilder = schemaBuilder[constraintName](...constraintValue);
        } else {
            let args = _createArgs(schemaBuilder, constraintName, constraintValue);

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
                    const allowUnknown = (propertyMetadata.allowUnknown === true) ? true : false;
                    const abortEarly = (propertyMetadata.abortEarly === true) ? true : false;

                    const options = {
                        abortEarly: abortEarly,
                        allowUnknown: allowUnknown,
                    };

                    const {error, value} = validator.schemaValidator.validate(state[validator.modelName], options);

                    if (!error) {
                        state[errorPropName] = null;

                        return;
                    }

                    const errors = {};

                    // error.propName means that this plugin created it, not joi
                    if (error.propName) {
                        errors[error.propName] = error.message;
                    } else {
                        for (const detail of error.details) {
                            const key = detail.context.key;
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
            const validatorConfig = config['plugins']['validator'];

            if (!hasKey(validatorConfig, 'models')) {
                throw new Error(`Invalid validator config. 'models' key is empty`);
            }

            const generalConfig = {
                allowUnknown: (validatorConfig.allowUnknown !== true) ? false : true,
            };

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

                const joiSchema = Joi.object(builtSchema);

                const validator = {
                    schemaValidator: joiSchema,
                    modelName: modelName,
                    propertyMetadata: deepcopy(propertyMetadata),
                    generalConfig: generalConfig,
                };

                compiler.add(_createDefinition(validator));
            }
        }
    },
    init: function() {
        return {};
    }
};
