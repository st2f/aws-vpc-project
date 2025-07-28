import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import pkg from "pg";
const { Client } = pkg;

const REGION = "eu-west-3";
const SECRET_NAME = "rds!db-28e8e4f0-88fc-4b2c-a60f-e1ec26fc8192";
const HOST = "db-video-meta.cfyqm28mcu7m.eu-west-3.rds.amazonaws.com";

export const handler = async () => {
    console.log("Début.");

    const secretsClient = new SecretsManagerClient({ region: REGION });
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const { SecretString } = await secretsClient.send(command);
    const creds = JSON.parse(SecretString);

    const clientAdmin = new Client({
        host: HOST,
        port: 5432,
        user: creds.username,
        password: creds.password,
        database: "postgres",
        ssl: { rejectUnauthorized: false }
    });

    try {
        await clientAdmin.connect();
        console.log("Connecté à 'postgres'. Tentative de création de la base 'streaming'.");

        await clientAdmin.query(`CREATE DATABASE streaming`);
        console.log("Base 'streaming' créée.");
    } catch (err) {
        if (err.code === '42P04') {
            console.log("La base 'streaming' existe déjà.");
        } else {
            console.error("Erreur lors de la création de la base :", err);
            throw err;
        }
    } finally {
        await clientAdmin.end();
    }

    const client = new Client({
        host: HOST,
        port: 5432,
        user: creds.username,
        password: creds.password,
        database: "streaming",
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connecté à 'streaming'.");

        const sql = `
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        s3_key TEXT NOT NULL,
        title TEXT,
        uploader_email TEXT,
        size BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

        await client.query(sql);
        console.log("Table 'videos' créée (ou déjà existante).");
    } catch (err) {
        console.error("Erreur lors de la création de la table :", err);
        throw err;
    } finally {
        await client.end();
    }
};