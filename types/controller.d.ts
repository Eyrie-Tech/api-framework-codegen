/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Controller {
  name: string;
  description: string;
  imports: {
    name: string;
    path: string;
  }[];
  methods: {
    type: string;
    name: string;
    parameters?: {
      body?: {
        name: string;
        type: string;
      }[];
      params?: {
        in?: string;
        required?: boolean;
        name: string;
      }[];
    };
    url: string;
    contentType?: string;
  }[];
}
