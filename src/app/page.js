import dynamic from "next/dynamic";

const DashBoard=dynamic(()=>import('@/components/dashBoard'),{
  ssr:false
});

export default function Home()
{
  return(
    <DashBoard />
  )
}