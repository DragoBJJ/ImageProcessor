import path from "path";

import {ImageProcessor} from "./imageProcessor";
import {ImageProcessorConfigType} from "./type";

const createImageProcessorBuilder = (
  config?: Partial<ImageProcessorConfigType>
) => {
  const newConfig = {
    batchSize: parseInt(process.env.DEFAULT_BATCH_SIZE ?? "", 10),
    filePath: path.join(__dirname, `data/data.csv`),
    ...(config ?? {}),
  };
  return new ImageProcessor(newConfig);
};

const imageProcessor = createImageProcessorBuilder();

imageProcessor.start();
