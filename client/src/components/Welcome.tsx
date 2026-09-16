import { Typography } from "antd";

const { Title, Paragraph } = Typography;

interface WelcomeProps {
  title: string;
  subtitle: string;
}

export default function Welcome({ title, subtitle }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center bg-primary-600 p-12 text-white lg:flex-1">
      <div className="max-w-md text-center">
        <div className="mb-8 text-6xl">📝</div>
        <Title level={2} className="!mb-4 !text-white">
          {title}
        </Title>
        <Paragraph className="!text-lg !text-primary-100">
          {subtitle}
        </Paragraph>
        <div className="mt-8 flex flex-col gap-4 text-left">
          <div className="flex items-start gap-3">
            <span className="mt-1 text-xl">✅</span>
            <span className="text-primary-100">Write and publish blog posts</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 text-xl">✅</span>
            <span className="text-primary-100">Manage your content easily</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 text-xl">✅</span>
            <span className="text-primary-100">Share with the community</span>
          </div>
        </div>
      </div>
    </div>
  );
}
