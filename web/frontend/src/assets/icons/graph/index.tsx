import React from "react";

interface GraphIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const GraphIcon = React.forwardRef<SVGSVGElement, GraphIconProps>(
  ({ size = 16, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        {...props}
      >
        <mask
          id="mask0_1865_14070"
          style={{ maskType: "alpha" }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_1865_14070)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6 15.5C6 15.2239 5.77614 15 5.5 15H2.5C2.22386 15 2 15.2239 2 15.5C2 15.7761 2.22386 16 2.5 16H5.5C5.77614 16 6 15.7761 6 15.5Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M15 9.5C15 9.22386 14.7761 9 14.5 9L6.5 9C6.22386 9 6 9.22386 6 9.5C6 9.77614 6.22386 10 6.5 10L14.5 10C14.7761 10 15 9.77614 15 9.5Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M19.6 7.5C19.6 7.22386 19.3761 7 19.1 7L8.89997 7C8.62383 7 8.39997 7.22386 8.39997 7.5C8.39997 7.77614 8.62383 8 8.89997 8L19.1 8C19.3761 8 19.6 7.77614 19.6 7.5Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M22 5.5C22 5.22386 21.7761 5 21.5 5L11.5 5C11.2239 5 11 5.22386 11 5.5C11 5.77614 11.2239 6 11.5 6L21.5 6C21.7761 6 22 5.77614 22 5.5Z"
            fill="currentColor"
          />
          <path
            d="M11 11.5C11 11.2239 10.7761 11 10.5 11H4.5C4.22386 11 4 11.2239 4 11.5C4 11.7761 4.22386 12 4.5 12H10.5C10.7761 12 11 11.7761 11 11.5Z"
            fill="currentColor"
          />
          <path
            d="M9 13.5C9 13.2239 8.77614 13 8.5 13H3.5C3.22386 13 3 13.2239 3 13.5C3 13.7761 3.22386 14 3.5 14H8.5C8.77614 14 9 13.7761 9 13.5Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M22 18.5C22 18.2239 21.7761 18 21.5 18H2.5C2.22386 18 2 18.2239 2 18.5C2 18.7761 2.22386 19 2.5 19L21.5 19C21.7761 19 22 18.7761 22 18.5Z"
            fill="currentColor"
          />
        </g>
      </svg>
    );
  }
);

GraphIcon.displayName = "GraphIcon";

export default GraphIcon;
