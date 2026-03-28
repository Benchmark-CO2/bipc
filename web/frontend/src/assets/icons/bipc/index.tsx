import React from "react";

interface BipcIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const BipcIcon = React.forwardRef<SVGSVGElement, BipcIconProps>(
  ({ size = 16, className, ...props }, ref) => {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        ref={ref}
        {...props}
      >
        <mask
          id="mask0_1866_7446"
          style={{ maskType: "alpha" }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_1866_7446)">
          <path
            d="M15.2857 13.1679C15.2857 12.2573 16.0532 11.5191 17 11.5191H18.7143C19.9767 11.5191 21 12.5034 21 13.7176V17.0153H17.5714C16.3091 17.0153 15.2857 16.031 15.2857 14.8168V13.1679Z"
            fill="currentColor"
          />
          <path
            d="M7.28571 3H14.1429V7.12214H8.42857C7.79739 7.12214 7.28571 7.61428 7.28571 8.22137V15.7786C7.28571 16.3857 7.79739 16.8779 8.42857 16.8779H14.1429V21H7.28571C4.91878 21 3 19.1545 3 16.8779V7.12214C3 4.84554 4.91878 3 7.28571 3Z"
            fill="currentColor"
          />
        </g>
      </svg>
    );
  },
);

BipcIcon.displayName = "BipcIcon";

export default BipcIcon;
