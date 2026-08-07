const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendTicketEmail = async (toEmail, eventTitle, seatId, qrDataUrl) => {
    try {
        if (!toEmail) return;

        // Convert Base64 Data URL to a clean Buffer for Nodemailer attachment
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        await transporter.sendMail({
            from: `"RSVP Portal" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Your Verified Ticket for ${eventTitle}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Reservation Confirmed!</h2>
          <p>Event: <strong>${eventTitle}</strong></p>
          <p>Seat: <strong>${seatId}</strong></p>
          <p>Present the QR code below at the venue entrance for check-in:</p>
          <img src="cid:ticketqrcode" alt="Ticket QR Code" style="width: 200px; height: 200px;" />
        </div>
      `,
            attachments: [
                {
                    filename: 'qrcode.png',
                    content: imageBuffer,
                    cid: 'ticketqrcode' // Matches src="cid:ticketqrcode" in HTML
                }
            ]
        });
    } catch (error) {
        console.error('Email dispatch error:', error.message);
    }
};