import { HOME_SECTION } from 'config/constants'
import React from 'react'
import { useRouter } from 'next/router'

const FutureSection: React.FC = () => {
  const {
    description,
    getExt,
    imgExt,
    imgBgMobile,
    linkExt,
    features,
  } = HOME_SECTION

  const router = useRouter()

  return (
    <section className="pt-[100px] lg:pt-[200px] bg-cover bg-center w-full future-section-bg xl:h-screen md:h-[75vh] lg:h-screen overflow-hidden bg-[#F9FCFF]">
      <div className="container mx-auto">
        <div className="max-w-[542px] pb-12 md:pb-0">
          <h1 className="text-[36px] font-sans leading-[120%] font-medium pr-5 md:text-[57px] md:leading-[119%]">
            Your{' '}
            <span className="bg-clip-text  bg-gradient-to-r from-[#b4e7d7] to-[#6ad5aa] text-transparent">
              ultimate
            </span>{' '}
            <span className="bg-clip-text  bg-gradient-to-r from-[#b4e7d7] to-[#6ad5aa]  text-transparent">
              tools
            </span>{' '}
            on Aptos
          </h1>
          <p className="text-[#000000] w-[327px] text-[18px] leading-[153%] pt-4 pb-6 pr-[26px] md:pr-0 lg:w-auto lg:pr-[170px]">
            {description}
          </p>

          <div className="text-[#000000] w-[327px] text-[14px] leading-[153%] pt-4 pb-6 pr-[22px] md:pr-0 lg:w-auto lg:pr-[170px]">
            <ul className="flex flex-col gap-4 list-inside list-disc">
              {features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          <a
            href={linkExt}
            onClick={(e) => {
              e.preventDefault()
              router.push(linkExt)
            }}
            rel="noreferrer"
            className="flex justify-between items-center bg-[#14161A] max-w-[186px] max-h-[48px] text-white px-6 py-[13px] text-center text-[17px] leading-[120%] rounded-[100px] hover:cursor-pointer hover:opacity-[0.92] font-medium"
          >
            <img src={imgExt} alt="Get Started" width={24} className="mr-1" />
            <span>{getExt}</span>
          </a>
        </div>
      </div>
      <img className="block md:hidden w-full" src={imgBgMobile} alt="image" />
    </section>
  )
}

export default FutureSection
