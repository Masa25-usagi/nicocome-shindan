type Props = { message: string };

export default function LoadingScreen({ message }: Props) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__spinner" />
      <p className="loading-screen__msg">{message}</p>
    </div>
  );
}
