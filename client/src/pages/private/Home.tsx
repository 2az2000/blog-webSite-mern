import {
  ArrowRightOutlined,
  CalendarOutlined,
  EditOutlined,
  MailOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Card, Divider, message, Skeleton, Tag, Typography } from "antd";
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

const formatMemberSince = (date?: string) => {
  if (!date) return "Recently joined";

  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? "Recently joined"
    : `Member since ${new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
      }).format(parsedDate)}`;
};

export default function Home() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCurrentUser = async () => {
    try {
      const response = await getCurrentUser();
      setUser(response);
    } catch (error:any) {
      message.error(error.message || "Failed to fetch current user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const initials = user?.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        {loading ? (
          <Card className="!border-0 !shadow-sm">
            <Skeleton active avatar paragraph={{ rows: 5 }} />
          </Card>
        ) : user ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section>
              <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-xl shadow-slate-200 sm:px-9 sm:py-10">
                <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-blue-500/30 blur-2xl" />
                <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-500/20 blur-2xl" />
                <div className="relative">
                  <Tag color={user.isAdmin ? "gold" : "blue"} className="!mb-5 !border-0 !px-3 !py-1">
                    {user.isAdmin ? "Administrator" : "Writer account"}
                  </Tag>
                  <Title level={1} className="!mb-3 !text-3xl !text-white sm:!text-4xl">
                    Welcome back, {user.name.split(" ")[0]}.
                  </Title>
                  <Text className="!text-base !text-slate-300">
                    Your personal publishing space is ready whenever inspiration strikes.
                  </Text>
                </div>
              </div>

              <Card className="!mt-6 !border-0 !shadow-sm" styles={{ body: { padding: 0 } }}>
                <div className="flex items-center justify-between p-6 pb-4">
                  <div>
                    <Title level={4} className="!mb-1">Your account</Title>
                    <Text type="secondary">Details from your profile</Text>
                  </div>
                  <Button icon={<EditOutlined />} type="text" aria-label="View profile" onClick={() => navigate("/profile")} />
                </div>
                <Divider className="!my-0" />
                <div className="divide-y divide-slate-100 px-6">
                  <div className="flex items-center gap-4 py-5">
                    <MailOutlined className="text-lg text-blue-600" />
                    <div>
                      <Text type="secondary" className="!block !text-xs">EMAIL ADDRESS</Text>
                      <Text strong>{user.email}</Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 py-5">
                    <CalendarOutlined className="text-lg text-blue-600" />
                    <div>
                      <Text type="secondary" className="!block !text-xs">ACCOUNT STATUS</Text>
                      <Text strong>{formatMemberSince(user.createdAt)}</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            <aside className="space-y-6">
              <Card className="!border-0 !shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <Avatar size={92} src={user.profilePicture} className="!bg-blue-100 !text-2xl !font-semibold !text-blue-600">
                    {initials || "U"}
                  </Avatar>
                  <Title level={3} className="!mb-1 !mt-4">{user.name}</Title>
                  <Text type="secondary">{user.email}</Text>
                  <Tag color="success" className="!mt-4 !rounded-full !px-3">Active</Tag>
                </div>
              </Card>

              <Card className="!border-0 !shadow-sm" title="Quick actions">
                <div className="space-y-2">
                  <Button type="primary" size="large" block icon={<EditOutlined />} iconPosition="end">
                    Write a new post
                  </Button>
                  <Button size="large" block icon={<SettingOutlined />} iconPosition="end" onClick={() => navigate("/profile")}>
                    Account settings
                  </Button>
                  <Button size="large" type="text" block icon={<ArrowRightOutlined />} iconPosition="end">
                    Browse the community
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
        ) : (
          <Card className="!border-0 !text-center !shadow-sm">
            <Title level={3}>We couldn&apos;t load your profile</Title>
            <Text type="secondary">Please sign in again to access your dashboard.</Text>
            <br />
            <Button type="primary" className="!mt-5" onClick={() => navigate("/login")}>
              Go to sign in
            </Button>
          </Card>
        )}
        </div>
    </main>
  );
}
