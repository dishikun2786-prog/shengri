import * as jwt from 'jsonwebtoken';
// Sign directly as user 34 (yilonghui)
const token = jwt.sign({ sub: 34, uuid: 'some-uuid' }, 'dev-jwt-secret-for-local-testing', { expiresIn: '7d' });
console.log(token);
