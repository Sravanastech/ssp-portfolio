import { CircleUserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";

const AuthenticatedMenu = () => {
  const { user, logout } = useAuth0();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-9 px-4 py-2 has-[>svg]:px-3 font-bold text-lg hover:text-[#FFFDF2] hover:bg-[#000000] font-[lato]">
        <CircleUserRound className="text-[#000000] hover:text-[#FFFDF2]" />
        {user?.email}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full bg-[#FFFDF2]">
        <DropdownMenuItem>
          <Link to="/account" className="flex flex-1">
            <Button
              variant="ghost"
              className="flex flex-1 font-bold text-lg text-[#000000] hover:bg-[#000000] hover:text-[#FFFDF2] font-[lato]"
            >
              Account
            </Button>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/admin" className="flex flex-1"><Button variant="ghost" className="flex flex-1 font-bold text-lg">Site editor</Button></Link>
        </DropdownMenuItem>
        <Separator />
        <DropdownMenuItem>
          <Button
            variant="ghost"
            className="flex flex-1 font-bold text-lg text-[#000000] hover:bg-[#000000] hover:text-[#FFFDF2] font-[lato]"
            onClick={async () => await logout()}
          >
            {" "}
            Logout{" "}
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthenticatedMenu;
