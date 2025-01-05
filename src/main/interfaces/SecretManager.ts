export interface Secret {
  ARN?: string;
  Name?: string;
  Description?: string;
  LastChangedDate?: Date;
  SecretString?: string;
  Tags?: { Key: string; Value: string }[];
}

export interface SecretValue {
  [key: string]: string;
}
