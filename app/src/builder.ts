import {ImageProcessor} from "./imageProcessor";
import {ImageProcessorConfigType} from "./type";
import {createNewConfig} from "./utils";

export const createImageProcessorBuilder = (
  config?: Partial<ImageProcessorConfigType>
) => {
  const newConfig = createNewConfig(config);
  return new ImageProcessor(newConfig);
};
