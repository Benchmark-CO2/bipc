import { cn } from '@/lib/utils';

type IconProps = {
  isActive?: boolean;
}
export const HouseIcon = ({ isActive }: IconProps) => {

  return (
    <svg width="43" height="38" viewBox="0 0 43 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_1866_30338)">
      <path d="M0 7.09561V9.60686H0.768994V37.9893H41.1332V38H42.284V9.60686H43V7.09561L21.5 0L0 7.09561ZM14.6533 36.8512H7.25506V18.7756H14.6533V36.8512ZM29.0149 26.6994H21.5V18.3909H29.0149V26.6994Z" stroke="#A1A1AA" className={cn('fill-white', {
        'fill-primary': isActive,
      })}/>
      </g>
      <defs>
      <clipPath id="clip0_1866_30338">
      <rect width="43" height="38"  />
      </clipPath>
      </defs>
    </svg>
  )
}