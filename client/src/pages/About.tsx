import { Card, Typography } from "antd";
import { Link } from "react-router-dom";

const { Title, Paragraph } = Typography;

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Title level={2} className="!mb-6 text-center">
          About
        </Title>

        <Card>
          <Paragraph>This is the about page of the blog application.</Paragraph>
          <Paragraph>
            Built with React, Vite, Tailwind CSS, Ant Design, and React Router.
          </Paragraph>
        </Card>

        <div className="mt-4 text-center">
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
