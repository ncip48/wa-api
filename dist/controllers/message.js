"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = exports.sendBulk = exports.send_text = exports.send = exports.list = void 0;
const baileys_store_1 = require("@ookamiiixd/baileys-store");
const baileys_1 = require("@whiskeysockets/baileys");
const shared_1 = require("../shared");
const utils_1 = require("../utils");
const wa_1 = require("../wa");
const list = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { cursor = undefined, limit = 25 } = req.query;
        const messages = (await shared_1.prisma.message.findMany({
            cursor: cursor ? { pkId: Number(cursor) } : undefined,
            take: Number(limit),
            skip: cursor ? 1 : 0,
            where: { sessionId },
        })).map((m) => (0, baileys_store_1.serializePrisma)(m));
        res.status(200).json({
            data: messages,
            cursor: messages.length !== 0 && messages.length === Number(limit)
                ? messages[messages.length - 1].pkId
                : null,
        });
    }
    catch (e) {
        const message = 'An error occured during message list';
        shared_1.logger.error(e, message);
        res.status(500).json({ error: message });
    }
};
exports.list = list;
const send = async (req, res) => {
    try {
        const { jid, type = 'number', message, options } = req.body;
        const session = (0, wa_1.getSession)(req.params.sessionId);
        const exists = await (0, wa_1.jidExists)(session, jid, type);
        if (!exists)
            return res.status(400).json({ error: 'JID does not exists' });
        const result = await session.sendMessage(jid, message, options);
        res.status(200).json(result);
    }
    catch (e) {
        const message = 'An error occured during message send';
        shared_1.logger.error(e, message);
        res.status(500).json({ error: message });
    }
};
exports.send = send;
const send_text = async (req, res) => {
    try {
        const { number, message: m, options } = req.body;
        const session = (0, wa_1.getSession)(req.body.key);
        //parsing jid as 6282143652236@s.whatsapp.net
        const jid = `${number.startsWith('0')
            ? '62' + number.slice(1)
            : number.startsWith('+')
                ? number.slice(1)
                : number}@s.whatsapp.net`;
        const exists = await (0, wa_1.jidExists)(session, jid, 'number');
        if (!exists)
            return res.status(400).json({ error: 'Number does not exists' });
        const message = {
            text: m,
        };
        const result = await session.sendMessage(jid, message, options);
        console.log(result);
        if ((result === null || result === void 0 ? void 0 : result.status) === 1) {
            return res.status(200).json({
                success: true,
                message: 'Message sent successfully',
                error: null,
            });
        }
        else {
            return res.status(501).json({
                success: false,
                message: 'Message not sent',
                error: result,
            });
        }
    }
    catch (e) {
        const message = 'An error occured during message send';
        shared_1.logger.error(e, message);
        return res.status(500).json({
            success: false,
            message: 'Message not sent',
            error: message,
        });
    }
};
exports.send_text = send_text;
const sendBulk = async (req, res) => {
    const session = (0, wa_1.getSession)(req.params.sessionId);
    const results = [];
    const errors = [];
    for (const [index, { jid, type = 'number', delay = 1000, message, options },] of req.body.entries()) {
        try {
            const exists = await (0, wa_1.jidExists)(session, jid, type);
            if (!exists) {
                errors.push({ index, error: 'JID does not exists' });
                continue;
            }
            if (index > 0)
                await (0, utils_1.delay)(delay);
            const result = await session.sendMessage(jid, message, options);
            results.push({ index, result });
        }
        catch (e) {
            const message = 'An error occured during message send';
            shared_1.logger.error(e, message);
            errors.push({ index, error: message });
        }
    }
    res
        .status(req.body.length !== 0 && errors.length === req.body.length ? 500 : 200)
        .json({ results, errors });
};
exports.sendBulk = sendBulk;
const download = async (req, res) => {
    try {
        const session = (0, wa_1.getSession)(req.params.sessionId);
        const message = req.body;
        const type = Object.keys(message.message)[0];
        const content = message.message[type];
        const buffer = await (0, baileys_1.downloadMediaMessage)(message, 'buffer', {}, { logger: shared_1.logger, reuploadRequest: session.updateMediaMessage });
        res.setHeader('Content-Type', content.mimetype);
        res.write(buffer);
        res.end();
    }
    catch (e) {
        const message = 'An error occured during message media download';
        shared_1.logger.error(e, message);
        res.status(500).json({ error: message });
    }
};
exports.download = download;
