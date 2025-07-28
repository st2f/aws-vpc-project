import { UserManager } from "oidc-client-ts";

const cognitoAuthConfig = {
    authority: "https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_sgE3y7FuI",
    client_id: "4a181cn2hmkraa2g2l4gsl6vt6",
    redirect_uri: "http://localhost:5174/callback.html",
    response_type: "code",
    scope: "phone openid email"
};

// create a UserManager instance
export const userManager = new UserManager({
    ...cognitoAuthConfig,
});

export async function signOutRedirect () {
    const clientId = "4a181cn2hmkraa2g2l4gsl6vt6";
    const logoutUri = "http://localhost:5174/";
    const cognitoDomain = "https://eu-west-3sge3y7fui.auth.eu-west-3.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};