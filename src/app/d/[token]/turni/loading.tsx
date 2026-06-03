import { MyShiftsSkeleton } from "@/components/skeletons";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function Loading() {
  return (
    <Box sx={{ maxWidth: 460, mx: "auto", minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Skeleton variant="rounded" width={90} height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="70%" sx={{ fontSize: "1.4rem" }} />
        <Skeleton variant="rounded" width={150} height={24} sx={{ mt: 1 }} />
      </Box>
      <MyShiftsSkeleton />
    </Box>
  );
}
