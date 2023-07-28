import Footer from 'components/Footer/Footer'
import Header from 'components/Header/Header'
import FutureSection from 'components/Home/FutureSection'
import type { NextPage } from 'next'
import Head from 'next/head'
import { Fragment } from 'react'
import Scroll from 'react-scroll'

// import Router from 'next/router'

// Router.reload()
const Element = Scroll.Element

// console.log(window);

const SubApp: NextPage = () => {
  // const router = useRouter()
  // router.reload()

  return (
    <Fragment>
      <Head>
        <title>Aptools - Toolset specifically for you on Aptos</title>
        <meta
          name="description"
          content="Aptools - All-in-one tools for Aptos blockchain"
        />
        <meta property="og:site_name" content="Aptools - Tools for Aptos" />
        <meta property="og:title" content="Aptools - Tools for Aptos" />
        <meta
          property="og:description"
          content="Aptools - All-in-one tools for Aptos blockchain"
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://aptools.xyz/preview.jpg" />
        <meta property="og:image:alt" content="Preview of Aptools website" />
        <meta property="og:url" content="https://aptools.xyz" />
        <meta
          property="og:image:secure_url"
          content="https://aptools.xyz/preview.jpg"
        />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="418" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta
          property="twitter:image"
          content="https://aptools.xyz/preview.jpg"
        />
        <meta property="twitter:site" content="@aptools_" />
        {/* Favicon */}
        <link
          rel="apple-touch-icon"
          sizes="57x57"
          href="/apple-icon-57x57.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="60x60"
          href="/apple-icon-60x60.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="72x72"
          href="/apple-icon-72x72.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="76x76"
          href="/apple-touch-icon.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="114x114"
          href="/apple-icon-114x114.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="120x120"
          href="/apple-icon-120x120.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="144x144"
          href="/apple-icon-144x144.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/apple-icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-icon-180x180.png"
        />

        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <Header />
      <main>
        <FutureSection />
      </main>
      <Footer />
    </Fragment>
  )
}

export default SubApp
