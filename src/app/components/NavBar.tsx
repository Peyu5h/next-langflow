import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="bg-background mb-4 border-b">
      <div className="container flex h-14 items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink
                  className={`group bg-background hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                    isActive("/") ? "bg-accent/50" : ""
                  }`}
                >
                  LangChain
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/agenticFlow" legacyBehavior passHref>
                <NavigationMenuLink
                  className={`group bg-background hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                    isActive("/agenticFlow") ? "bg-accent/50" : ""
                  }`}
                >
                  Agentic Flow
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/rag" legacyBehavior passHref>
                <NavigationMenuLink
                  className={`group bg-background hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                    isActive("/rag") ? "bg-accent/50" : ""
                  }`}
                >
                  RAG
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}
