import { getSignedUrl } from "@aws-sdk/cloudfront-signer"

export const handler = async (event) => {
    console.log("📥 requête reçue avec headers :", JSON.stringify(event.headers))

    try {
        const claims = event.requestContext?.authorizer?.jwt?.claims
        if (!claims) {
            console.warn("❌ aucun claims trouvé dans requestContext")
            throw new Error("token non décodé par api gateway")
        }

        console.log("✅ claims JWT extraits :", claims)

        const { email, "cognito:username": username, sub } = claims
        console.log("📧 email :", email)
        console.log("👤 username :", username)
        console.log("🆔 sub :", sub)

        const { s3_key } = JSON.parse(event.body || "{}")
        if (!s3_key) {
            console.warn("❌ aucun s3_key dans le body")
            throw new Error("clé s3 manquante")
        }

        console.log("📦 s3_key reçu :", s3_key)

        const expires = new Date(Date.now() + 3600 * 1000)
        const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, "\n")

        const signedUrl = getSignedUrl({
            url: `${process.env.CLOUDFRONT_URL}/${s3_key}`,
            keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
            dateLessThan: expires,
            privateKey
        })

        console.log("✅ URL signée générée")

        return {
            statusCode: 200,
            body: JSON.stringify({
                url: signedUrl,
                email,
                username,
                sub,
                claims // toutes les infos brutes si tu veux les utiliser ailleurs
            })
        }
    } catch (err) {
        console.error("❌ erreur lambda :", err)
        return {
            statusCode: 403,
            body: JSON.stringify({ message: "accès refusé" })
        }
    }
}