import { forwardRef } from "react";
import { useRouterContext } from "../router";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, onClick, ...rest }, ref) {
  const { navigate } = useRouterContext();
  return (
    <a
      ref={ref}
      href={"#" + href.replace(/^\//, "").replace(/[^A-Za-z0-9._~-]/g, "-")}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
});

export default Link;
