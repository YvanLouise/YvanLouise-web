import { config } from "../config.js";
import { saveR2PreparedAsset } from "./r2Storage.js";
import {
  LocalAssetRequestContext,
  PreparedAssetPayload,
  StoredAsset,
  UploadedAssetPayload,
  prepareUploadedAsset,
  saveLocalPreparedAsset
} from "./uploads.js";

export function isLocalAssetStorage(): boolean {
  return config.assetStorageMode === "local";
}

export async function savePreparedAsset(
  asset: PreparedAssetPayload,
  requestContext?: LocalAssetRequestContext
): Promise<StoredAsset> {
  if (config.assetStorageMode === "r2") {
    return saveR2PreparedAsset(asset);
  }

  if (!requestContext) {
    throw new Error("本地文件存储需要请求上下文来生成公开访问地址。");
  }

  return saveLocalPreparedAsset(asset, requestContext);
}

export async function saveUploadedAsset(
  payload: UploadedAssetPayload,
  requestContext?: LocalAssetRequestContext
): Promise<StoredAsset> {
  const asset = prepareUploadedAsset(payload);
  return savePreparedAsset(asset, requestContext);
}
