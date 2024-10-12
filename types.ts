type ParameterSchema = {
  type: string;
};

type Parameter = {
  in: string;
  name: string;
  required: boolean;
  schema: ParameterSchema;
};

export type DefResponse = {
  summary: string;
  operationId: string;
  responses: { [key: string]: Response };
  parameters?: Parameter[];
  requestBody?: { required: boolean; content: any };
};

export type Spec = {
  paths: {
    [key: string]: Def;
  };
  components: {
    schemas: Schema;
  };
};

type Content = {
  schema: {
    type: string;
    items: {
      [key: string]: string;
    };
  };
};

type Response = {
  description: string;
  content: {
    [key: string]: Content;
  };
};

type Def = {
  [key: string]: DefResponse;
};

type Schema = {
  [key: string]: {
    type: string;
    properties: {
      [key: string]: {
        type: string;
        format?: string;
        enum?: string;
        items?: {
          type: string;
          enum: string[];
        } | string;
      };
    };
  };
};
