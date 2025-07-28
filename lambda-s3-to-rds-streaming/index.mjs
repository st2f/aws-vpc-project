import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import pkg from "pg";
const { Client } = pkg;

const REGION = "eu-west-3";
const SECRET_NAME = "rds!db-28e8e4f0-88fc-4b2c-a60f-e1ec26fc8192";
const HOST = "db-video-meta.cfyqm28mcu7m.eu-west-3.rds.amazonaws.com";
const DBNAME = "streaming";

const secretsClient = new SecretsManagerClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

export const handler = async (event) => {
    console.log("📥 Événement reçu :", JSON.stringify(event, null, 2));

    const record = event.Records?.[0];
    const bucket = record?.s3?.bucket?.name;
    const key = decodeURIComponent(record?.s3?.object?.key.replace(/\+/g, " "));
    const size = record?.s3?.object?.size;

    console.log("📦 Fichier uploadé :", { bucket, key, size });

    try {
        const secretCommand = new GetSecretValueCommand({ SecretId: SECRET_NAME });
        const { SecretString } = await secretsClient.send(secretCommand);
        const creds = JSON.parse(SecretString);

        const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: key });
        const { Metadata } = await s3.send(headCommand);

        const title = Metadata?.title || null;
        const uploader_email = Metadata?.uploader_email || null;

        console.log("📋 Métadonnées récupérées :", { title, uploader_email });

        const client = new Client({
            host: HOST,
            port: 5432,
            user: creds.username,
            password: creds.password,
            database: DBNAME,
            ssl: { rejectUnauthorized: false },
        });

        await client.connect();

        await client.query(
            `INSERT INTO videos (s3_key, bucket, size, created_at, title, uploader_email)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
            [key, bucket, size, title, uploader_email]
        );

        console.log("✅ Insertion réussie :", key);
        await client.end();

    } catch (err) {
        console.error("❌ Erreur :", err);
        throw err;
    }
};