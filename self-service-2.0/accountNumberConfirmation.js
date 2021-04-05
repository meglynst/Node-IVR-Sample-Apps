require('dotenv-safe').config()
const express = require('express')
const freeclimbSDK = require('@freeclimb/sdk')
const host = process.env.HOST
const accountId = process.env.ACCOUNT_ID
const authToken = process.env.AUTH_TOKEN
const freeclimb = freeclimbSDK(accountId, authToken)

router = express.Router()

let confirmNumberErrCount = 0
let retries = 0

router.post('/confirmAccountNumberPrompt', (req, res) => {
    res.status(200).json(
        freeclimb.percl.build(
            freeclimb.percl.getSpeech(
                `${host}/confirmAccountNumber?acct=${req.param('acct')}`,
                `${host}/accountNumberConfirmationGrammar`,
                {
                    grammarType: freeclimb.enums.grammarType.URL,
                    grammarRule: 'option',
                    prompts: [
                        freeclimb.percl.say(
                            `You entered ${req.param(
                                'acct'
                            )} is that correct? Press 1 or say yes to confirm your account number or press 2 or say no to try again`
                        )
                    ]
                }
            )
        )
    )
})

router.post('/confirmAccountNumber', (req, res) => {
    const getSpeechResponse = req.body
    const response = getSpeechResponse.recognitionResult
    let menuOpts
    if (req.body.reason === freeclimb.enums.getSpeechReason.DIGIT) {
        menuOpts = new Map([
            [
                '1',
                {
                    audioUrl: `${host}/accountNumberConfirmationAudio?audio=proceed.wav`,
                    redirect: `${host}/accountLookup?acct=${req.param('acct')}`
                }
            ],
            [
                '2',
                {
                    audioUrl: `${host}/accountNumberConfirmationAudio?audio=retry.wav`,
                    redirect: `${host}/accountNumberPrompt`
                }
            ],
            [
                '0',
                {
                    audioUrl: `${host}/accountNumberConfirmationAudio?audio=operator.wav`,
                    redirect: `${host}/transfer`
                }
            ]
        ])
    } else if (req.body.reason === freeclimb.enums.getSpeechReason.RECOGNITION) {
        menuOpts = new Map([
            [
                'YES',
                {
                    audioUrl: `${host}/accountNumberConfirmationAudio?audio=proceed.wav`,
                    redirect: `${host}/accountLookup?acct=${req.param('acct')}`
                }
            ],
            [
                'NO',
                {
                    audioUrl: `${host}/accountNumberConfirmationAudio?audio=retry.wav`,
                    redirect: `${host}/accountNumberPrompt`
                }
            ],
            [
                'OPERATOR',
                {
                    audioUrl: `${host}/accountNumberConfirmationAudio?audio=operator.wav`,
                    redirect: `${host}/transfer`
                }
            ]
        ])
    }

    if ((!response || !menuOpts.get(response)) && confirmNumberErrCount < 3) {
        confirmNumberErrCount++
        res.status(200).json(
            freeclimb.percl.build(
                freeclimb.percl.play(`${host}/accountNumberConfirmationAudio?audio=shortError.wav`),
                freeclimb.percl.redirect(
                    `${host}/confirmAccountNumberPrompt?acct=${req.param('acct')}`
                )
            )
        )
    } else if (confirmNumberErrCount >= 3 || retries >= 2) {
        confirmNumberErrCount = 0
        res.status(200).json(
            freeclimb.percl.build(
                freeclimb.percl.play(`${host}/accountNumberConfirmationAudio?audio=operator.wav`),
                freeclimb.percl.pause(100),
                freeclimb.percl.redirect(`${host}/transfer`)
            )
        )
    } else {
        confirmNumberErrCount = 0
        if (response === '2' || response === 'NO') {
            retries++ // retries tracked separately from input errors
        } else if (response === '1' || response === 'YES') {
            retries = 0
        }
        res.status(200).json(
            freeclimb.percl.build(
                freeclimb.percl.play(menuOpts.get(response).audioUrl),
                freeclimb.percl.redirect(menuOpts.get(response).redirect)
            )
        )
    }
})

router.get('/accountNumberConfirmationGrammar', function (req, res) {
    const file = `${__dirname}/accountNumberConfirmationGrammar.xml`
    res.download(file)
})

router.get('/accountNumberConfirmationAudio', function (req, res) {
    const file = `${__dirname}/audioFiles/accountNumberConfirmation/${req.param('audio')}`
    res.download(file)
})

module.exports = router
