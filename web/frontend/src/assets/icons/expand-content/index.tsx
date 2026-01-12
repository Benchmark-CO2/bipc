import React from "react";

interface ExpandContentIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const ExpandContentIcon = React.forwardRef<
  SVGSVGElement,
  ExpandContentIconProps
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
        id="mask0_2867_4891"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="30"
        height="30"
      >
        <rect width="30" height="30" fill="#D9D9D9" />
      </mask>
      <g mask="url(#mask0_2867_4891)">
        <path
          d="M6.24805 23.7495V16.2495H8.74805V21.2495H13.748V23.7495H6.24805ZM21.248 13.7495V8.74951H16.248V6.24951H23.748V13.7495H21.248Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
});

ExpandContentIcon.displayName = "ExpandContentIcon";

export default ExpandContentIcon;
