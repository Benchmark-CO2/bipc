interface ICustomBanner {
  title: string
  description: string
  image: string
}
const CustomBanner = ({ title, description, image }: ICustomBanner) => {
  return (
    <div className='w-full max-md:w-11/12 h-38 shadow-lg shadow-zinc-600 dark:shadow-zinc-900 rounded-md mx-auto relative'>
      <img className="h-full w-full object-cover z-1 absolute right-0 top-0 rounded-md " src={image} />

      <div className="absolute top-0 bg-gradient-to-r left-0 from-zinc-800 to-zinc-700/50 text-white w-full h-full z-2 rounded-md p-4 max-md:p-2 flex flex-col justify-around">
        <h1 className="text-lg capitalize font-semibold">{title}</h1>
        <p className="w-2/3 h-2/3 max-md:w-full max-md:overflow-hidden max-md:h-2/5 max-md:line-clamp-2 max-lg:line-clamp-4 text-ellipsis ">{description}</p>
      </div>
    </div>
  )
}

export default CustomBanner