import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";

const LoadingButton = () => {
  return (
    <Button
      disabled
      className="font-bold text-lg hover:text-[#FFFDF2] hover:bg-[#000000] font-[lato]"
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading
    </Button>
  );
};

export default LoadingButton;
