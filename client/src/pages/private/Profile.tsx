import { CalendarOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Descriptions, message, Skeleton, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/users-service";

const { Title, Text } = Typography;

type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  isAdmin?: boolean;
  createdAt?: string;
};

const displayDate = (date?: string) => {
  if (!date || Number.isNaN(new Date(date).getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(date));
};

export default function Profile() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setUser(await getCurrentUser());
      } catch (error: any) {
        message.error(error.message || "Failed to load your profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const initials = user?.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Text className="!font-medium !text-blue-600">ACCOUNT</Text>
          <Title level={1} className="!mb-2 !mt-1 !text-3xl !text-slate-900">Your profile</Title>
          <Text type="secondary">View the information associated with your Blogspace account.</Text>
        </div>

        {loading ? (
          <Card className="!border-0 !shadow-sm"><Skeleton active avatar paragraph={{ rows: 6 }} /></Card>
        ) : user ? (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <Card className="!border-0 !shadow-sm">
              <div className="flex flex-col items-center text-center">
                <Avatar size={112} src={user.profilePicture} className="!bg-blue-100 !text-3xl !font-semibold !text-blue-600">{initials || "U"}</Avatar>
                <Title level={3} className="!mb-1 !mt-5">{user.name}</Title>
                <Text type="secondary">{user.email}</Text>
                <Tag color={user.isAdmin ? "gold" : "blue"} className="!mt-5 !rounded-full !px-3">
                  {user.isAdmin ? "Administrator" : "Writer"}
                </Tag>
              </div>
            </Card>

            <Card className="!border-0 !shadow-sm" title="Personal information">
              <Descriptions column={1} labelStyle={{ width: 148, color: "#64748b" }}>
                <Descriptions.Item label={<span><UserOutlined className="mr-2" />Full name</span>}>{user.name}</Descriptions.Item>
                <Descriptions.Item label={<span><MailOutlined className="mr-2" />Email address</span>}>{user.email}</Descriptions.Item>
                <Descriptions.Item label={<span><CalendarOutlined className="mr-2" />Joined</span>}>{displayDate(user.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Account ID"><Text code>{user._id}</Text></Descriptions.Item>
              </Descriptions>
              <Button type="primary" className="!mt-6" onClick={() => navigate("/")}>Back to dashboard</Button>
            </Card>
          </div>
        ) : (
          <Card className="!border-0 !text-center !shadow-sm">
            <Title level={3}>We couldn&apos;t load your profile</Title>
            <Button type="primary" className="!mt-4" onClick={() => navigate("/login")}>Sign in again</Button>
          </Card>
        )}
      </div>
    </main>
  );
}
