{
  /* MODERATION TAB */
}
{
  /* {activeTab === "moderation" && ( */
}
{
  /* <> */
}
{
  /* Moderation Stats */
}
{
  /* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-card/50 border-destructive/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Flagged Bounties
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {flaggedBounties}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending review
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Active Disputes
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDisputes}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    2 escalated
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Resolution Rate
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">94%</div>
                  <p className="text-xs text-green-500 mt-1">Within 48 hours</p>
                </CardContent>
              </Card>
            </div> */
}

{
  /* Disputes Table */
}
{
  /* <Card className="bg-card/50 overflow-hidden border-muted mb-8">
              <CardHeader className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Disputes</CardTitle>
                    <CardDescription>
                      Pending disputes requiring moderation
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[300px] py-3">Bounty</TableHead>
                      <TableHead>Parties</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DUMMY_DISPUTES.map((dispute) => (
                      <TableRow
                        key={dispute.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium py-4">
                          <span className="line-clamp-1">
                            {dispute.bountyTitle}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              {dispute.issuer}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              vs {dispute.hunter}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {dispute.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              dispute.status === "open"
                                ? "outline"
                                : dispute.status === "escalated"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {dispute.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>
                                Contact Parties
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Close Dispute
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card> */
}

{
  /* Flagged Bounties */
}
{
  /* <Card className="bg-card/50 overflow-hidden border-muted">
              <CardHeader className="p-6 border-b">
                <div>
                  <CardTitle>Flagged Bounties</CardTitle>
                  <CardDescription>
                    Bounties flagged for policy violations or quality issues
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="py-3">Bounty</TableHead>
                      <TableHead>Flag Reason</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bounties
                      .filter((b) => !b.isApproved)
                      .map((bounty) => (
                        <TableRow
                          key={bounty.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium py-4">
                            {bounty.title}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            Pending approval
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleApprovalChange(bounty.id, true)
                              }
                              disabled={isUpdating}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleApprovalChange(bounty.id, false)
                              }
                              disabled={isUpdating}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card> */
}
{
  /* </> */
}
{
  /* )} */
}

{
  /* USERS TAB */
}
{
  /* {activeTab === "users" && ( */
}
{
  /* <> */
}
{
  /* User Stats */
}
{
  /* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {nonAdminUsers.filter((u) => u.role === "CLIENT").length}{" "}
                    active
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Hunters</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalHunters}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verified developers
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Suspended
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Under review
                  </p>
                </CardContent>
              </Card>
            </div> */
}

{
  /* Users Table */
}
{
  /* <Card className="bg-card/50 overflow-hidden border-muted">
              <CardHeader className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                      Manage hunters and clients
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="py-3">User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bounties</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonAdminUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={"/placeholder-user.jpg"} />
                              <AvatarFallback>
                                {user.name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "CLIENT" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Active</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {
                            bounties.filter((b) => b.assignee === user.id)
                              .length
                          }
                        </TableCell>
                        <TableCell className="font-mono text-sm">$0</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                User Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Send Message</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Suspend User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card> */
}
{
  /* </> */
}
{
  /* )} */
}
