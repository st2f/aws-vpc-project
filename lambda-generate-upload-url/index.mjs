import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// configuration
const REGION = "eu-west-3"
const BUCKET = "streaming-video-789915097184"

// client S3
const s3 = new S3Client({ region: REGION })

export const handler = async (event) => {
    console.log("📥 requête reçue")
    console.log("🔍 headers :", JSON.stringify(event.headers, null, 2))

    try {
        console.log("🔍 payload :", JSON.stringify(event))

        // récupération de l'email depuis les claims du JWT décodé par API Gateway
        const email = event.requestContext?.authorizer?.jwt?.claims?.email
        if (!email) {
            console.warn("❌ aucun email trouvé dans l’id_token")
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "email manquant dans le token" })
            }
        }

        const key = `uploads/${email}/${Date.now()}.mp4`
        console.log("📂 génération URL pour :", key)

        const body = JSON.parse(event.body || "{}")
        const title = body.title || "sans titre"

        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: "video/mp4",
            Metadata: {
                title,
                uploader_email: email
            }
        })

        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
        console.log("✅ url signée générée")

        return {
            statusCode: 200,
            body: JSON.stringify({ url: signedUrl, key, email })
        }

    } catch (err) {
        console.error("❌ erreur pendant le traitement :", err)
        return {
            statusCode: 403,
            body: JSON.stringify({ message: "token invalide ou expiré" })
        }
    }
}