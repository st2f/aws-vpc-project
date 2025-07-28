import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import pkg from "pg"

const { Client } = pkg

const REGION = "eu-west-3";
const SECRET_NAME = "rds!db-28e8e4f0-88fc-4b2c-a60f-e1ec26fc8192";
const HOST = "db-video-meta.cfyqm28mcu7m.eu-west-3.rds.amazonaws.com";

export const handler = async (event) => {
    console.log("📥 requête reçue")
    console.log("🔍 headers :", JSON.stringify(event.headers, null, 2))

    try {
        const claims = event.requestContext?.authorizer?.jwt?.claims
        if (!claims || !claims.email) {
            console.warn("❌ email non trouvé dans les claims JWT")
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "email manquant ou token non traité par API Gateway" })
            }
        }

        const email = claims.email
        console.log("📧 email utilisateur :", email)

        const secretsClient = new SecretsManagerClient({ region: REGION })
        const command = new GetSecretValueCommand({ SecretId: SECRET_NAME })

        console.log("🔑 récupération du secret :", SECRET_NAME)
        const { SecretString } = await secretsClient.send(command)
        const creds = JSON.parse(SecretString)
        console.log("✅ secrets récupérés :", creds.username)

        const client = new Client({
            host: HOST,
            port: 5432,
            user: creds.username,
            password: creds.password,
            database: "streaming",
            ssl: { rejectUnauthorized: false }
        })

        console.log("🔌 connexion à la base de données...")
        await client.connect()
        console.log("✅ connecté à la base")

        console.log("📄 exécution de la requête pour :", email)
        const { rows } = await client.query(`
      SELECT s3_key, title, created_at, size
      FROM videos
      WHERE uploader_email = $1
      ORDER BY created_at DESC
    `, [email])

        await client.end()
        console.log("📦 résultats :", rows)

        return {
            statusCode: 200,
            body: JSON.stringify(rows),
            headers: {
                "Access-Control-Allow-Origin": "*"
            }
        }
    } catch (err) {
        console.error("❌ erreur :", err)
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "erreur serveur" })
        }
    }
}