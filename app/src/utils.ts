import path from "path";
import {ImageProcessorConfigType} from "./type";

export const createNewConfig = (config?: Partial<ImageProcessorConfigType>) => {
  return {
    batchSize: parseInt(process.env.DEFAULT_BATCH_SIZE ?? "", 10),
    filePath: path.join(__dirname, `data/data.csv`),
    ...(config ?? {}),
  };
};
