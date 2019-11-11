const {is, ucFirst, getArgNames, hasKey} = require('../../../library/util');
const Joi = require('@hapi/joi');

function _createSchemaBuilder(type, constraints) {
    let schemaBuilder = Joi[type]();

    for (const [constraintName, constraintValue] of Object.entries(constraints)) {
        if (Array.isArray(constraintValue)) {
            schemaBuilder = schemaBuilder[constraintName](...constraintValue);

            continue;
        }

        let args = [];
        const argStrings = getArgNames(constraints[constraintName]);

        if (argStrings.length > 0) {
            args = [constraintValue];
        }

        schemaBuilder = schemaBuilder[constraintName](...args);
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
                state[errorPropName] = null;

                if (!state[validator.modelName]) {
                    state[errorPropName] = {
                        'all': `Invalid request. Unknown model '${validator.modelName}'`
                    };

                    return;
                }

                if (state[validator.modelName]) {
                    const {error, value} = validator.schemaValidator.validate(state[validator.modelName]);

                    const errors = {};

                    for (const detail of error.details) {
                        const key = detail.context.label;
                        const value = detail.message;

                        errors[key] = value;
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

            }
            if (!is('object', validatorConfig['models'])) {
                return null;
            }

            const models = validatorConfig['models'];

            for (const [modelName, propertyMetadata] of Object.entries(models)) {
                const builtSchema = {};
                const globalErrorMessage = propertyMetadata['nonExistentModelMessage'];

                try {
                    for (const [propName, constraintMetadata] of Object.entries(propertyMetadata['properties'])) {
                        builtSchema[propName] = _createSchemaBuilder(
                            constraintMetadata['type'],
                            constraintMetadata['constraints']
                        );
                    }
                } catch (err) {
                    const message = `Validator plugin error. An error has been thrown by Joi from Hapi.js with message: '${err.message}'`;

                    throw new Error(message);
                }

                const validator = {
                    schemaValidator: Joi.object(builtSchema),
                    modelName: modelName,
                    globalErrorMessage: globalErrorMessage
                };

                compiler.add(_createDefinition(validator));
            }
        }
    },
    init: function() {
        return {};
    }
};