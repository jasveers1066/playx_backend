require('dotenv').config(); // Environment variables ke liye
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

// 🔥 Browser me blank/error na aaye uske liye Welcome message 🔥
app.get('/', (req, res) => {
    res.send('PlayX Backend is Live and Running on Cloud! 🚀');
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; 

const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Koi video file nahi aayi bhai!' });
        }

        console.log(`Video aayi hai: ${req.file.originalname}, ab Telegram par bhej rahe hain...`);

        const form = new FormData();
        form.append('chat_id', TELEGRAM_CHAT_ID);
        form.append('video', fs.createReadStream(req.file.path));

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`;
        
        const response = await axios.post(telegramUrl, form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        fs.unlinkSync(req.file.path);

        if (response.data.ok) {
            const videoData = response.data.result.video;
            const fileId = videoData.file_id;
            const messageId = response.data.result.message_id;
            
            console.log('Telegram par upload SUCCESS! File ID:', fileId);

            res.status(200).json({
                success: true,
                fileId: fileId,
                messageId: messageId,
                permanentLink: `https://t.me/c/${TELEGRAM_CHAT_ID.replace('-100', '')}/${messageId}`
            });
        } else {
            res.status(500).json({ error: 'Telegram API Error' });
        }

    } catch (error) {
        console.error('Upload Error:', error.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Server Crash ho gaya upload karte waqt' });
    }
});

app.get('/api/get-video-url/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        
        const fileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
        const fileResponse = await axios.get(fileUrl);
        
        if (!fileResponse.data.ok) {
            return res.status(404).json({ success: false, error: 'File nahi mili Telegram par' });
        }
        
        const filePath = fileResponse.data.result.file_path;

        const directUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

        res.status(200).json({ 
            success: true, 
            directUrl: directUrl 
        });
        
    } catch (error) {
        console.error("URL Fetch Error:", error.message);
        res.status(500).json({ success: false, error: 'Server error fetching link' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`PlayX Server chal gaya hai PORT ${PORT} par! 🚀`);
});