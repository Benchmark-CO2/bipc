import React from 'react';

interface BipcIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const BipcIcon = React.forwardRef<SVGSVGElement, BipcIconProps>(
  ({ size = 16, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        className={className}
        {...props}
      >
        <mask
          id="mask0_1987_1353"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="16"
          height="16"
        >
          <rect width="16" height="16" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_1987_1353)">
          <path
            d="M9.8254 8.64885C9.8254 8.14295 10.2518 7.73282 10.7778 7.73282H11.7302C12.4315 7.73282 13 8.27965 13 8.9542V10.7863H11.0952C10.3939 10.7863 9.8254 10.2394 9.8254 9.56489V8.64885Z"
            fill="currentColor"
          />
          <path
            d="M5.38095 3H9.19048V5.29008H6.01587C5.66522 5.29008 5.38095 5.56349 5.38095 5.90076V10.0992C5.38095 10.4365 5.66522 10.7099 6.01587 10.7099H9.19048V13H5.38095C4.06599 13 3 11.9747 3 10.7099V5.29008C3 4.0253 4.06599 3 5.38095 3Z"
            fill="currentColor"
          />
        </g>
      </svg>
    );
  }
);

BipcIcon.displayName = 'BipcIcon';

export default BipcIcon;