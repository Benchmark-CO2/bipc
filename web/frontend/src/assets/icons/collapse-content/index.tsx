import React from "react";

interface CollapseContentIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const CollapseContentIcon = React.forwardRef<
  SVGSVGElement,
  CollapseContentIconProps
>(({ size = 16, className, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      className={className}
      {...props}
    >
      <mask
        id="mask0_2867_4881"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="30"
        height="30"
      >
        <rect width="30" height="30" fill="#D9D9D9" />
      </mask>
      <g mask="url(#mask0_2867_4881)">
        <path
          d="M13.748 16.2495V23.7495H11.248V18.7495H6.24805V16.2495H13.748ZM18.748 6.24951V11.2495H23.748V13.7495H16.248V6.24951H18.748Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
});

CollapseContentIcon.displayName = "CollapseContentIcon";

export default CollapseContentIcon;
