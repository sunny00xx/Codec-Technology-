const {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const { encrypt, decrypt } = require('./encryption');
const fs = require('fs');
const path = require('path');

// Check if we should use local storage (if AWS is not configured)
const isLocal = !process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID.includes('your-aws') ||
    !process.env.AWS_BUCKET_NAME ||
    process.env.AWS_BUCKET_NAME.includes('your-s3');

const uploadToS3 = async (key, buffer, mimeType) => {
    const encrypted = encrypt(buffer);
    if (isLocal) {
        const fileName = key.replace(/\//g, '_');
        const filePath = path.join(__dirname, '../../uploads', fileName);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, encrypted);
        return;
    }
    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: encrypted,
            ContentType: 'application/octet-stream',
            ServerSideEncryption: 'AES256',
        })
    );
};

const getPresignedUrl = async (key, expiresIn = 3600) => {
    if (isLocal) {
        const fileName = key.replace(/\//g, '_');
        return `${process.env.API_URL || 'http://localhost:5000'}/api/documents/serve/${fileName}`;
    }
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn });
};

const downloadFromS3 = async (key) => {
    let encrypted;
    if (isLocal) {
        const fileName = key.replace(/\//g, '_');
        const filePath = path.join(__dirname, '../../uploads', fileName);
        encrypted = fs.readFileSync(filePath);
    } else {
        const response = await s3Client.send(
            new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
        );
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        encrypted = Buffer.concat(chunks);
    }
    return decrypt(encrypted);
};

const deleteFromS3 = async (key) => {
    if (isLocal) {
        const fileName = key.replace(/\//g, '_');
        const filePath = path.join(__dirname, '../../uploads', fileName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return;
    }
    await s3Client.send(
        new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
};

module.exports = { uploadToS3, getPresignedUrl, downloadFromS3, deleteFromS3 };
