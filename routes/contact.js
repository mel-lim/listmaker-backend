const express = require('express');
const contactRouter = express.Router();
module.exports = contactRouter;

const nodemailer = require("nodemailer");

const contactEmail = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
    },
})

contactEmail.verify((error) => {
    if (error) {
        console.error(error);
    } else {
        console.log("Ready to send");
    }
});

contactRouter.post('', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const subject = req.body.subject;
    const message = req.body.message;
    const source = req.body.source || "Kit Collab";

    const mail = {
        from: name,
        to: process.env.EMAIL,
        subject: `Contact form submission from ${name}`,
        html:   `<p>Name: ${name}</p>
                <p>Email: ${email}</p>
                <p>Subject: ${subject}</p>
                <p>Message: ${message}</p>
                <p>Source: ${source}</p>`
    };

    contactEmail.sendMail(mail, (error) => {
        if (error) {
            res.json({ "status": "500", "message": "Something went wrong. Your message was not sent."});
            // for some reason res.status not sending status through to front end
        } else {
            res.json({ "status": "201", "message": "Your message has been sent, thank you!" });
        }
    });
});


