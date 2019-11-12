const Joi = require('@hapi/joi');

const username = Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required();

const birthYear = Joi.number()
    .integer()
    .min(1900)
    .max(2013);

const buildSchema = {
    username: username,
    birthYear: birthYear
};

const schema = Joi.object(buildSchema);

/*
const schema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required(),

    password: Joi.string()
        .pattern(/^[a-zA-Z0-9]{3,30}$/),

    repeat_password: Joi.ref('password'),

    access_token: [
        Joi.string(),
        Joi.number()
    ],

    birth_year: Joi.number()
        .integer()
        .min(1900)
        .max(2013),

    email: Joi.string()
        .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
});
*/

const {error, value} = schema.validate({ username: 'abc', birthYear: 1994, somethingElse: 'dfdsfsaf' }, {
    allowUnknown: false
});

console.log(error, value);
