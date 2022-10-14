require('dotenv').config();
import crypto from 'crypto';
var base64url = require('base64url');
const fs = require('fs');
const NodeRSA = require('node-rsa');
var jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const { UserService, UserInfo } = require('../../src/av/user.service');

// This is a sample Token generated by Auth0
const token =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IklNUHNTeENoeXM0dC1rZlY0Z3NhLSJ9.eyJpc3MiOiJodHRwczovL2Rldi10OWp4YjNrOS51cy5hdXRoMC5jb20vIiwic3ViIjoiYXV0aDB8NWYxZjdkZDMzMWExMjIwMDM3Zjk4ZWNkIiwiYXVkIjoiaHR0cHM6Ly90b2dldGhlcjFhcGkudG9nZXRoZXJzZW5pb3JsaWZlLmNvbSIsImlhdCI6MTU5Nzk1NTI4NywiZXhwIjoxNTk4MDQxNjg3LCJhenAiOiJRWkd4UFpwQUcxaXBEd0o5Z2RIdjVRN3VrSDNlVjlVQiIsInNjb3BlIjoicmVhZDpzZXNzaW9uIiwiZ3R5IjoicGFzc3dvcmQiLCJwZXJtaXNzaW9ucyI6WyJpZ25vcmU6Z2xvYmFsY21kcyIsInF1ZXJ5OnNlc3Npb24iLCJyZWFkOnNlc3Npb24iLCJzZXRnbG9iYWw6bG9nb3V0Iiwic2V0Z2xvYmFsOm11dGUiLCJzZXRnbG9iYWw6dmlldyIsInNldHJlbW90ZTptdXRlIiwic2V0cmVtb3RlOnZpZXciLCJzdHJlYW06aW5zdHVjdG9ydmlldyIsInRlYWNoOnNlc3Npb24iLCJ0ZXN0OnNlc3Npb24iLCJ1cGRhdGU6c2Vzc2lvbiJdfQ.eBPLVFFMP9S_eUQMRAJdjDIyRNSJKmpg7m3Q1iX30-VtFz1Cw4MzlCB8me6MaNvP_x6jTO55q0gzQt3RHNF0m2jWQl4um9oA7QwM3jf9XYZ7MXZEI_VuxDtOrJPV1S7mWc6sHAXoCygMDcrqJQ3nme8s0NLC1loM3VxDNf2fdiekaimfxwk5tda_P44JA13sRbNhF90nnDn6frB_TvTJvMPlIDxu22bmwJktHy8koT6ev30cZpwKSMxPmNDAxs1tdFJABi2O-4PV9f6vIVqTvlVXnmWDpwnYnS_JrvIuGEhbYMHhWCHle78-1EXSlx6IPkbOtXmCiM2hnD3HRaLaWw';

// The corresponding payload
const payload = {
    iss: 'https://dev-t9jxb3k9.us.auth0.com/',
    sub: 'auth0|5f1f7dd331a1220037f98ecd',
    aud: 'https://together1api.togetherseniorlife.com',
    iat: 1598044262,
    exp: new Date(8640000000000000).getTime() / 1000,
    azp: 'QZGxPZpAG1ipDwJ9gdHv5Q7ukH3eV9UB',
    scope: 'read:session',
    gty: 'password',
    permissions: [
        'ignore:globalcmds',
        'query:session',
        'read:session',
        'setglobal:logout',
        'setglobal:mute',
        'setglobal:view',
        'setremote:mute',
        'setremote:view',
        'stream:instuctorview',
        'teach:session',
        'test:session',
        'update:session',
    ],
};

// Generate RSA Keys.
// See https://github.com/auth0/node-jsonwebtoken/issues/68
var key = new NodeRSA({ b: 512 });
key.setOptions({
    encryptionScheme: {
        scheme: 'pkcs1',
        label: 'Optimization-Service',
    },
    signingScheme: {
        saltLength: 25,
    },
});
const keys = {
    private: key.exportKey('pkcs1-private-pem'),
    public: key.exportKey('pkcs8-public-pem'),
};

// We could save the files if we like
// fs.writeFileSync("private.key", keys.private);
// fs.writeFileSync("public.key", keys.public);

describe('JWT And Encryption Tests', () => {
    it('should generate random token', async () => {
        var randomToken = base64url(crypto.randomBytes(48));
        expect(randomToken.length).toBeGreaterThanOrEqual(48);
    });

    it('Should decode Aut0 Signed Token', async () => {
        const tokenDecoded = jwt.decode(token, { complete: true });
        expect(tokenDecoded).toBeTruthy();
        expect(tokenDecoded.header).toBeTruthy();
        expect(tokenDecoded.header.alg).toEqual('RS256');
        expect(tokenDecoded.payload).toBeTruthy();
        expect(tokenDecoded.payload.sub).toEqual(
            'auth0|5f1f7dd331a1220037f98ecd'
        );
    });

    it('Should sign and verify JWT Token using local key', async () => {
        // privateKey = fs.readFileSync("private.key");
        // publicKey = fs.readFileSync("public.key");

        var token2 = jwt.sign(payload, keys.private, { algorithm: 'RS256' });
        var tokenVerified = jwt.verify(token2, keys.public, {
            algorithm: 'RS256',
        });
        try {
            jwt.verify(token2 + '-', keys.public, {
                algorithm: 'RS256',
            });
        } catch (e) {
            // Expected this!
            expect(e.message).toContain('invalid');
        }
    });
});
