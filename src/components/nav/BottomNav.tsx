import { Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { IconType } from "react-icons";
import { FiClock, FiHeart, FiHome } from "react-icons/fi";
import { RiPlayListFill } from "react-icons/ri";
import { Link, useLocation } from "react-router-dom";
export interface LinkItemProps {
  name: string;
  icon: IconType;
  path: string;
  disabled?: boolean;
}

const LinkItems: Array<LinkItemProps> = [
  { name: "Home", icon: FiHome, path: "/" },
  { name: "Recently Played", icon: FiClock, path: "/history" },
  { name: "Liked Songs", icon: FiHeart, path: "/liked" },
  { name: "Library", icon: RiPlayListFill, path: "/library" },
  //   { name: "My Playlists", icon: FiServer, path: "/playlists" },
  //   { name: "Settings", icon: FiSettings, path: "/settings" },
];
export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <Flex
      minHeight="56px"
      justify="space-evenly"
      bgColor="bg.900"
      paddingBottom="calc(env(safe-area-inset-bottom)*0.5)"
      boxSizing="content-box"
    >
      {LinkItems.map(({ name, icon, path }) => (
        <Stack
          flex={1}
          justifyContent="center"
          alignItems="center"
          spacing={1}
          as={Link}
          to={path}
          key={path}
          color={path === pathname ? "brand.100" : "white"}
        >
          <Icon as={icon} aria-label={name} w={4} h={4} />
          <Text fontSize="sm" noOfLines={1}>
            {name}
          </Text>
        </Stack>
      ))}
    </Flex>
  );
}
