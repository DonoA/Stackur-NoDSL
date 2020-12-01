import AWS from "aws-sdk";

interface AWSAuthentication {
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
};

export function awsAuthenticate(auth: AWSAuthentication) {
    AWS.config.update(auth);
}