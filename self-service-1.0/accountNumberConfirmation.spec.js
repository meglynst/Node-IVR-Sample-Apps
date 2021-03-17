const { app } = require('./index')
const supertest = require('supertest')
const request = supertest(app)

require('dotenv-safe').config()

const host = process.env.HOST

describe('POST /confirmAccountNumberPrompt', () => {
    it('returns the percl commands for the account number confirmation menu getdigits including redirect and prompt', async () => {
        const res = await request.post('/confirmAccountNumberPrompt?acct=111222')
        expect(res.status).toBe(200)
        expect(res.body).toStrictEqual([
            {
                GetDigits: {
                    actionUrl: `${host}/confirmAccountNumber?acct=111222`,
                    flushBuffer: true,
                    maxDigits: 1,
                    minDigits: 1,
                    prompts: [
                        {
                            Say: {
                                text:
                                    'You entered 111222 is that correct? Press 1 to confirm your account number or 2 to try again'
                            }
                        }
                    ]
                }
            }
        ])
    })
})

describe('POST /confirmAccountNumber', () => {
    it('returns an error when no menu options are selected', async () => {
        const res = await request
            .post('/confirmAccountNumber?acct=111222')
            .type('form')
            .send({ digits: '' })
        expect(res.status).toBe(200)
        expect(res.body).toStrictEqual([
            {
                Say: {
                    text: "Error",
                },
            },
            {
                Redirect: {
                    actionUrl: "http://ff31fa983fc0.ngrok.io/confirmAccountNumberPrompt?acct=111222",
                },
            },
        ])
    })

    it('returns transfer to operator if max err limit reached', async () => {

        for (let i = 0; i <= 3; i++) {
            await request
                .post('/confirmAccountNumber?acct=111222')
                .type('form')
                .send({ digits: '' })
        }

        const res = await request
            .post('/confirmAccountNumber?acct=111222')
            .type('form')
            .send({ digits: '' })
        expect(res.status).toBe(200)
        expect(res.body).toStrictEqual([
            {
                Say: {
                    text: "Error",
                },
            },
            {
                Redirect: {
                    actionUrl: "http://ff31fa983fc0.ngrok.io/confirmAccountNumberPrompt?acct=111222",
                },
            },
        ])
    })




})
